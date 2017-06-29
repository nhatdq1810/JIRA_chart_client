import React, { Component } from 'react';

import showdown from 'showdown';
import Graph from 'react-graph-vis'
import './App.css';

const issuetype = ['Story', 'Epic', 'Task', 'Bug'];

class App extends Component {
  constructor(props) {
    super(props);

    const opts = {
      strikethrough: true,
      simpleLineBreaks: true
    };
    const converter = new showdown.Converter(opts);
    const options = {
      layout: { hierarchical: false },
      edges: { color: '#000000' }
    };

    this.state = {
      respIssues: [],
      currentNode: null,
      graph: null,
      options,
      events: {
        select: this.selectNode
      },
      issuetype: [],
      converter
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.issuetype.length > 0 && this.state.issuetype.length !== prevState.issuetype.length) {
      fetch('http://localhost:8000/issues', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issuetype: this.state.issuetype
        })
      })
        .then(resp => resp.json())
        .then(resp => {
          const nodes = [];
          const edges = [];

          resp.issues.forEach((issue) => {
            let color = 'rgb(99, 186, 60)';
            let shape = 'ellipse';
            let font = { color: 'white' };

            if (issue.fields.priority.name === 'Critical') {
              color = 'rgb(229, 73, 58)';
            }
            if (issue.fields.priority.name === 'Major') {
              color = 'rgb(75, 173, 232)';
            }

            if (issue.fields.status.name === 'Closed') {
              shape = 'box';
            }

            nodes.push({ id: issue.id, label: issue.key, color, shape, font });

            issue.fields.issuelinks.forEach((link => {
              if (link.type.name === 'Related') {
                if (link.inwardIssue) {
                  if (!edges.find(edge => edge.from === issue.id && edge.to === link.inwardIssue.id)) {
                    edges.push({ from: issue.id, to: link.inwardIssue.id, label: 'is related to' });
                  }
                  if (!edges.find(edge => edge.from === link.inwardIssue.id && edge.to === issue.id)) {
                    edges.push({ from: link.inwardIssue.id, to: issue.id });
                  }
                }
              } else {
                if (link.inwardIssue) {
                  if (!edges.find(edge => edge.from === issue.id && edge.to === link.inwardIssue.id)) {
                    edges.push({ from: issue.id, to: link.inwardIssue.id, label: 'is blocked by' });
                  }
                }
              }
            }))
          });

          this.setState({
            respIssues: resp.issues,
            graph: { nodes, edges }
          });
        });
    }
  }

  selectNode = (event) => {
    if (this.state.respIssues.length > 0) {
      const { nodes } = event;
      this.setState({
        currentNode: this.state.respIssues.find(issue => issue.id === nodes[0])
      });
    }
  }

  onChange = (event) => {
    const selectedType = event.target.value;
    let issuetype = [...this.state.issuetype];

    if (this.state.issuetype.includes(selectedType)) {
      issuetype = this.state.issuetype.filter(type => type !== selectedType);
    } else {
      issuetype.push(selectedType);
    }
    this.setState({ issuetype });
  }

  render() {
    const view = (
      <div>
        <p><strong>Issue Types are shown:</strong></p>
        {
          issuetype.map((type, key) => {
            return (
              <label key={key}>
                {type}
                <input
                  type="checkbox"
                  value={type}
                  onChange={this.onChange}
                  defaultChecked={this.state.issuetype.includes(type)} />
              </label>
            );
          })
        }
      </div>
    );

    if (this.state.graph) {
      return (
        <div>
          <main style={{ float: 'left', width: '70%', marginRight: '1%' }}>
            {view}
            <Graph
              style={{ height: '100vh', width: '100%' }}
              graph={this.state.graph}
              options={this.state.options}
              events={this.state.events} />
          </main>
          {
            this.state.currentNode &&
            <aside style={{ float: 'left', width: '29%' }}>
              <h1>{this.state.currentNode.fields.summary}</h1>
              <h2>{this.state.currentNode.key}</h2>
              <strong>Details</strong>
              <p>Type: {this.state.currentNode.fields.issuetype.name}</p>
              <p>Priority: {this.state.currentNode.fields.priority.name}</p>
              <p>Status: {this.state.currentNode.fields.status.name}</p>
              <strong>Descriptions</strong>
              <div
                dangerouslySetInnerHTML={{ __html: this.state.converter.makeHtml(this.state.currentNode.fields.description) }}
              />
              <strong>Issue Links</strong>
              {
                this.state.currentNode.fields.issuelinks.map((link) => {
                  if (link.inwardIssue) {
                    return (
                      <div>
                        <span>{link.type.inward}</span>
                        <span>{link.inwardIssue.key}</span>
                        <span>{link.inwardIssue.fields.summary}</span>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <span style={{ marginRight: '20px' }}>{link.type.outward}</span>
                      <span style={{ marginRight: '10px' }}>{link.outwardIssue.key}</span>
                      <span>{link.outwardIssue.fields.summary}</span>
                    </div>
                  )
                })
              }
            </aside>
          }
        </div>
      );
    }

    return (
      <div>
        {view}
        <p> Loading......</p>
      </div>
    );
  }
}

export default App;
